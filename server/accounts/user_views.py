from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .otp_service import send_approval_email
from .firebase_service import (
    get_all_farmers, get_all_extension_workers, get_user_by_id,
    delete_user, toggle_user_active, approve_extension_worker, update_user,
    get_notifications, mark_notification_read, mark_all_notifications_read, broadcast_admin_update,
    create_notification, notify_user_ws, get_all_admins
)

class FarmerListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        farmers = get_all_farmers()
        return Response(farmers)

class FarmerDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        user = get_user_by_id(user_id)
        if not user:
            return Response({'error': 'Farmer not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(user)

    def delete(self, request, user_id):
        user = get_user_by_id(user_id)
        if not user:
            return Response({'error': 'Farmer not found'}, status=status.HTTP_404_NOT_FOUND)
        delete_user(user_id)
        broadcast_admin_update('farmer_updated')
        return Response({'message': 'Farmer deleted successfully'})

class FarmerToggleActiveView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, user_id):
        user = get_user_by_id(user_id)
        if not user:
            return Response({'error': 'Farmer not found'}, status=status.HTTP_404_NOT_FOUND)
        toggle_user_active(user_id)
        broadcast_admin_update('farmer_updated')
        return Response({'message': 'Farmer status updated'})

class ExtensionWorkerListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        workers = get_all_extension_workers()
        return Response(workers)

class ExtensionWorkerDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        user = get_user_by_id(user_id)
        if not user:
            return Response({'error': 'Extension worker not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(user)

    def delete(self, request, user_id):
        user = get_user_by_id(user_id)
        if not user:
            return Response({'error': 'Extension worker not found'}, status=status.HTTP_404_NOT_FOUND)
        delete_user(user_id)
        broadcast_admin_update('worker_updated')
        return Response({'message': 'Extension worker deleted successfully'})

class ExtensionWorkerToggleActiveView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, user_id):
        user = get_user_by_id(user_id)
        if not user:
            return Response({'error': 'Extension worker not found'}, status=status.HTTP_404_NOT_FOUND)
        toggle_user_active(user_id)
        broadcast_admin_update('worker_updated')
        return Response({'message': 'Extension worker status updated'})

class ExtensionWorkerApproveView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, user_id):
        user = get_user_by_id(user_id)
        if not user:
            return Response({'error': 'Extension worker not found'}, status=status.HTTP_404_NOT_FOUND)
        approve_extension_worker(user_id)
        broadcast_admin_update('worker_updated')
        if user.get('email'):
            send_approval_email(user['email'], user['firstName'])
        return Response({'message': 'Extension worker approved'})

class ExtensionWorkerChangePositionView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, user_id):
        position_id = request.data.get('positionId')
        if not position_id:
            return Response({'error': 'Position ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        user = get_user_by_id(user_id)
        if not user:
            return Response({'error': 'Extension worker not found'}, status=status.HTTP_404_NOT_FOUND)
        update_user(user_id, {'positionId': position_id})
        broadcast_admin_update('worker_updated')
        return Response({'message': 'Position updated'})

class UploadProfilePictureView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile_picture = request.data.get('profilePicture')
        if not profile_picture:
            return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)
        update_user(request.user.id, {'profilePicture': profile_picture})
        return Response({'message': 'Profile picture updated', 'profilePicture': profile_picture})

class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = get_notifications(request.user.id)
        return Response(notifications)

class NotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, notification_id):
        mark_notification_read(request.user.id, notification_id)
        return Response({'message': 'Notification marked as read'})

class NotificationMarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        mark_all_notifications_read(request.user.id)
        return Response({'message': 'All notifications marked as read'})

class AllUsersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        farmers = get_all_farmers()
        workers = get_all_extension_workers()
        admins = get_all_admins()
        users = [
            {'id': u['id'], 'firstName': u['firstName'], 'lastName': u['lastName'], 'role': u['role']}
            for u in farmers + workers + admins
        ]
        return Response(users)

class SendNotificationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        user_ids = request.data.get('userIds', [])
        notif_type = request.data.get('type', '').strip()
        message = request.data.get('message', '').strip()
        file_data = request.data.get('fileData', '')
        file_name = request.data.get('fileName', '')
        file_type = request.data.get('fileType', '')
        if not user_ids or not notif_type or not message:
            return Response({'error': 'userIds, type, and message are required'}, status=status.HTTP_400_BAD_REQUEST)
        if file_data and len(file_data.encode('utf-8')) > 1048576:
            return Response({'error': 'File must be under 1MB.'}, status=status.HTTP_400_BAD_REQUEST)
        notif = {'type': notif_type, 'message': message}
        for user_id in user_ids:
            create_notification(user_id, notif_type, message, request.user.id, '', file_data, file_name, file_type)
            notify_user_ws(user_id, notif)
        return Response({'message': f'Notification sent to {len(user_ids)} user(s)'})