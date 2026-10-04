from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from datetime import datetime, timezone, timedelta
from .firebase_service import (
    extract_keywords, extract_keywords_combined, find_matching_ticket, create_ticket, join_ticket,
    get_all_tickets, get_all_tickets_filtered, get_available_ticket_years,
    get_tickets_by_worker, get_ticket_by_id, get_ticket_messages,
    get_knowledge_repository_visits, increment_knowledge_repository_visits,
    update_ticket_status, add_message, pin_message, delete_ticket, delete_message
)

class CheckTicketView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        concern = request.data.get('concern', '')
        title = request.data.get('title', '')
        extension_worker_id = request.data.get('extensionWorkerId', '')
        if not concern or not title or not extension_worker_id:
            return Response({'error': 'title, concern and extensionWorkerId are required'}, status=status.HTTP_400_BAD_REQUEST)
        keywords = extract_keywords_combined(title, concern)
        match = find_matching_ticket(extension_worker_id, keywords)
        if match:
            return Response({'exists': True, 'ticket': match})
        return Response({'exists': False})

class SubmitTicketView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        concern = request.data.get('concern', '')
        title = request.data.get('title', '')
        extension_worker_id = request.data.get('extensionWorkerId', '')
        extension_worker_name = request.data.get('extensionWorkerName', '')
        farmer_name = request.data.get('farmerName', '')
        join_existing = request.data.get('joinExisting', False)
        ticket_id = request.data.get('ticketId', None)
        file_data = request.data.get('fileData', '')
        file_name = request.data.get('fileName', '')
        file_type = request.data.get('fileType', '')

        if file_data and len(file_data.encode('utf-8')) > 1048576:
            return Response({'error': 'File must be under 1MB.'}, status=status.HTTP_400_BAD_REQUEST)

        if not concern or not title or not extension_worker_id:
            return Response({'error': 'title, concern and extensionWorkerId are required'}, status=status.HTTP_400_BAD_REQUEST)

        keywords = extract_keywords_combined(title, concern)

        if join_existing and ticket_id:
            join_ticket(ticket_id, request.user.id)
            from accounts.firebase_service import broadcast_ticket_update, create_notification, notify_user_ws
            broadcast_ticket_update()
            ticket = get_ticket_by_id(ticket_id)
            if ticket:
                worker_id = ticket.get('extensionWorkerId')
                if worker_id:
                    create_notification(worker_id, 'ticket_reply', f'{farmer_name} joined your ticket.', request.user.id, ticket_id)
                    notify_user_ws(worker_id, {'type': 'ticket_reply', 'message': f'{farmer_name} joined your ticket.'})
            return Response({'message': 'Joined existing ticket', 'ticketId': ticket_id})

        ticket_id = create_ticket({
            'extensionWorkerId': extension_worker_id,
            'extensionWorkerName': extension_worker_name,
            'title': title,
            'concern': concern,
            'keywords': keywords,
            'farmerId': request.user.id,
            'farmerName': farmer_name,
            'fileData': file_data,
            'fileName': file_name,
            'fileType': file_type,
        })
        from accounts.firebase_service import broadcast_ticket_update, create_notification, notify_user_ws
        broadcast_ticket_update()
        create_notification(extension_worker_id, 'ticket_reply', f'{farmer_name} submitted a ticket to you.', request.user.id, ticket_id)
        notify_user_ws(extension_worker_id, {'type': 'ticket_reply', 'message': f'{farmer_name} submitted a ticket to you.'})
        return Response({'message': 'Ticket created', 'ticketId': ticket_id}, status=status.HTTP_201_CREATED)

class TicketListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role == 'extension_worker':
            tickets = get_tickets_by_worker(request.user.id)
            return Response(tickets)
        if request.user.role == 'farmer':
            tickets = get_all_tickets()
            return Response(tickets)
        from datetime import date
        now = datetime.now(timezone.utc)
        week_start_str = request.query_params.get('week_start')
        if week_start_str:
            try:
                week_start_date = date.fromisoformat(week_start_str)
            except ValueError:
                current_monday = now - timedelta(days=now.weekday())
                week_start_date = current_monday.date()
        else:
            current_monday = now - timedelta(days=now.weekday())
            week_start_date = current_monday.date()
        tickets, week_start, week_end, month, year = get_all_tickets_filtered(week_start_date)
        available_years = get_available_ticket_years()
        return Response({
            'tickets': tickets,
            'weekLabel': f'{week_start} – {week_end}',
            'month': month,
            'year': year,
            'availableYears': available_years,
        })

class TicketDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, ticket_id):
        ticket = get_ticket_by_id(ticket_id)
        if not ticket:
            return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
        messages = get_ticket_messages(ticket_id)
        return Response({**ticket, 'messages': messages})

class KnowledgeRepositoryVisitsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({'visits': get_knowledge_repository_visits()})

    def post(self, request):
        increment_knowledge_repository_visits()
        return Response({'message': 'Visit recorded'})

class TicketStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, ticket_id):
        new_status = request.data.get('status')
        if new_status not in ['pending', 'ongoing', 'waiting_for_feedback', 'resolved', 'cancel_resolution']:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        ticket = get_ticket_by_id(ticket_id)
        if not ticket:
            return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
        from accounts.firebase_service import broadcast_ticket_update, create_notification, notify_user_ws, get_user_by_id
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        channel_layer = get_channel_layer()
        participants = ticket.get('participants', [])
        original_farmer_id = participants[0] if participants else None
        worker_id = ticket.get('extensionWorkerId')

        if new_status == 'waiting_for_feedback':
            if request.user.role != 'extension_worker':
                return Response({'error': 'Only extension workers can request resolution'}, status=status.HTTP_403_FORBIDDEN)
            update_ticket_status(ticket_id, 'waiting_for_feedback')
            user_data = get_user_by_id(request.user.id)
            worker_name = f"{user_data['firstName']} {user_data['lastName']}" if user_data else 'Unknown'
            if original_farmer_id:
                create_notification(original_farmer_id, 'ticket_waiting_feedback',
                    f'{worker_name} marked your ticket as resolved. Please confirm.',
                    request.user.id, ticket_id)
                notify_user_ws(original_farmer_id, {'type': 'ticket_waiting_feedback',
                    'message': f'{worker_name} marked your ticket as resolved. Please confirm.'})

        elif new_status == 'resolved':
            if request.user.role != 'farmer' or request.user.id != original_farmer_id:
                return Response({'error': 'Only the original farmer can confirm resolution'}, status=status.HTTP_403_FORBIDDEN)
            update_ticket_status(ticket_id, 'resolved')
            for participant_id in participants:
                create_notification(participant_id, 'ticket_resolved', 'Your ticket has been marked as resolved.', request.user.id, ticket_id)
                notify_user_ws(participant_id, {'type': 'ticket_resolved', 'message': 'Your ticket has been marked as resolved.'})
            if worker_id:
                create_notification(worker_id, 'ticket_resolved', 'The farmer confirmed the ticket as resolved.', request.user.id, ticket_id)
                notify_user_ws(worker_id, {'type': 'ticket_resolved', 'message': 'The farmer confirmed the ticket as resolved.'})

        elif new_status == 'cancel_resolution':
            if request.user.role != 'extension_worker':
                return Response({'error': 'Only extension workers can cancel resolution'}, status=status.HTTP_403_FORBIDDEN)
            update_ticket_status(ticket_id, 'ongoing')
            if original_farmer_id:
                create_notification(original_farmer_id, 'ticket_reply', 'The resolution request was cancelled. Ticket is ongoing.',
                    request.user.id, ticket_id)
                notify_user_ws(original_farmer_id, {'type': 'ticket_reply',
                    'message': 'The resolution request was cancelled. Ticket is ongoing.'})

        elif new_status == 'ongoing':
            update_ticket_status(ticket_id, 'ongoing')
            for participant_id in participants:
                create_notification(participant_id, 'ticket_reply', 'Your ticket is now being handled.', request.user.id, ticket_id)
                notify_user_ws(participant_id, {'type': 'ticket_reply', 'message': 'Your ticket is now being handled.'})

        elif new_status == 'pending':
            update_ticket_status(ticket_id, 'pending')

        broadcast_ticket_update()
        async_to_sync(channel_layer.group_send)(f'ticket_{ticket_id}', {
            'type': 'ticket_message',
            'data': {'type': 'new_message'},
        })
        return Response({'message': 'Status updated'})

class TicketMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, ticket_id):
        message = request.data.get('message', '').strip()
        file_data = request.data.get('fileData', '')
        file_name = request.data.get('fileName', '')
        file_type = request.data.get('fileType', '')
        if not message and not file_data:
            return Response({'error': 'message or file is required'}, status=status.HTTP_400_BAD_REQUEST)
        if file_data and len(file_data.encode('utf-8')) > 1048576:
            return Response({'error': 'File must be under 1MB.'}, status=status.HTTP_400_BAD_REQUEST)
        ticket = get_ticket_by_id(ticket_id)
        if not ticket:
            return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
        from accounts.firebase_service import get_user_by_id, create_notification, notify_user_ws
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        user_data = get_user_by_id(request.user.id)
        sender_name = f"{user_data['firstName']} {user_data['lastName']}" if user_data else 'Unknown'
        add_message(ticket_id, {
            'senderId': request.user.id,
            'senderName': sender_name,
            'senderRole': request.user.role,
            'message': message,
            'fileData': file_data,
            'fileName': file_name,
            'fileType': file_type,
        })
        if request.user.role == 'extension_worker' and ticket.get('status') == 'pending':
            update_ticket_status(ticket_id, 'ongoing')
        if request.user.role == 'farmer' and ticket.get('status') == 'resolved':
            update_ticket_status(ticket_id, 'pending')
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(f'ticket_{ticket_id}', {
            'type': 'ticket_message',
            'data': {'type': 'new_message'},
        })
        if request.user.role == 'extension_worker':
            notif_message = f'{sender_name} replied: {message}' if message else f'{sender_name} replied and sent an attachment.'
            notif = {'type': 'ticket_reply', 'message': notif_message}
            for participant_id in ticket.get('participants', []):
                create_notification(participant_id, 'ticket_reply', notif_message, request.user.id, ticket_id)
                notify_user_ws(participant_id, notif)
        elif request.user.role == 'farmer':
            worker_id = ticket.get('extensionWorkerId')
            if worker_id:
                notif_message = f'{sender_name} replied: {message}' if message else f'{sender_name} replied and sent an attachment.'
                notif = {'type': 'ticket_reply', 'message': notif_message}
                create_notification(worker_id, 'ticket_reply', notif_message, request.user.id, ticket_id)
                notify_user_ws(worker_id, notif)
        return Response({'message': 'Message sent'}, status=status.HTTP_201_CREATED)

class TicketMessageDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, ticket_id, message_id):
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can delete messages'}, status=status.HTTP_403_FORBIDDEN)
        ticket = get_ticket_by_id(ticket_id)
        if not ticket:
            return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
        delete_message(ticket_id, message_id)
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(f'ticket_{ticket_id}', {
            'type': 'ticket_message',
            'data': {'type': 'new_message'},
        })
        return Response({'message': 'Message deleted'})

class TicketDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, ticket_id):
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can delete tickets'}, status=status.HTTP_403_FORBIDDEN)
        ticket = get_ticket_by_id(ticket_id)
        if not ticket:
            return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
        delete_ticket(ticket_id)
        from accounts.firebase_service import broadcast_ticket_update
        broadcast_ticket_update()
        return Response({'message': 'Ticket deleted'})

class TicketPinView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, ticket_id, message_id):
        ticket = get_ticket_by_id(ticket_id)
        if not ticket:
            return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
        if request.user.role != 'extension_worker':
            return Response({'error': 'Only extension workers can pin messages'}, status=status.HTTP_403_FORBIDDEN)
        is_unpin = pin_message(ticket_id, message_id)
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(f'ticket_{ticket_id}', {
            'type': 'ticket_message',
            'data': {'type': 'pin_updated'},
        })
        if not is_unpin:
            from accounts.firebase_service import get_user_by_id, create_notification, notify_user_ws
            user_data = get_user_by_id(request.user.id)
            sender_name = f"{user_data['firstName']} {user_data['lastName']}" if user_data else 'Unknown'
            notif = {'type': 'ticket_pinned', 'message': f'{sender_name} pinned an answer on your ticket.'}
            for participant_id in ticket.get('participants', []):
                create_notification(participant_id, 'ticket_pinned', notif['message'], request.user.id, ticket_id)
                notify_user_ws(participant_id, notif)
        return Response({'message': 'Message unpinned' if is_unpin else 'Message pinned'})
