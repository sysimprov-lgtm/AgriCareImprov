import json
from channels.generic.websocket import AsyncWebsocketConsumer

class SystemConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add('system', self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard('system', self.channel_name)

    async def system_update(self, event):
        await self.send(text_data=json.dumps(event['data']))

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.group_name = f'notifications_{self.user_id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def send_notification(self, event):
        await self.send(text_data=json.dumps(event['data']))

class AdminUpdatesConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add('admin_updates', self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard('admin_updates', self.channel_name)

    async def admin_update(self, event):
        await self.send(text_data=json.dumps(event['data']))

class TicketUpdatesConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add('ticket_updates', self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard('ticket_updates', self.channel_name)

    async def ticket_update(self, event):
        await self.send(text_data=json.dumps(event['data']))

class TicketConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.ticket_id = self.scope['url_route']['kwargs']['ticket_id']
        self.group_name = f'ticket_{self.ticket_id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def ticket_message(self, event):
        await self.send(text_data=json.dumps(event['data']))
