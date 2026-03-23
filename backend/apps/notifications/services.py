from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Notification
from .serializers import NotificationSerializer


def send_notification(
    recipient, notification_type, title, message, related_book=None, related_loan=None
):
    notification = Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
        related_book=related_book,
        related_loan=related_loan,
    )

    channel_layer = get_channel_layer()
    serialized = NotificationSerializer(notification).data

    async_to_sync(channel_layer.group_send)(
        f"notifications_user_{recipient.id}",
        {
            "type": "send_notification",
            "data": serialized,
        },
    )

    return notification


def send_notification_to_all(
    notification_type, title, message, related_book=None, exclude_user=None
):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    users = User.objects.filter(is_active=True)
    if exclude_user:
        users = users.exclude(id=exclude_user.id)

    for user in users:
        send_notification(
            recipient=user,
            notification_type=notification_type,
            title=title,
            message=message,
            related_book=related_book,
        )
