from django.db import models
from core.mixins import TimestampMixin


class Notification(TimestampMixin, models.Model):
    class NotificationType(models.TextChoices):
        NEW_BOOK = "new_book", "Nouveau livre ajouté"
        BOOK_AVAILABLE = "book_available", "Livre disponible"
        BORROW_REQUEST_APPROVED = "request_approved", "Demande approuvée"
        BORROW_REQUEST_REJECTED = "request_rejected", "Demande rejetée"
        NEW_BORROW_REQUEST = "new_request", "Nouvelle demande d'emprunt"
        EXTENSION_APPROVED = "extension_approved", "Prolongation approuvée"
        EXTENSION_REJECTED = "extension_rejected", "Prolongation rejetée"
        LOAN_DUE_REMINDER = "loan_due", "Rappel d'échéance"
        LOAN_OVERDUE = "loan_overdue", "Prêt en retard"

    recipient = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(blank=True, null=True)
    related_book = models.ForeignKey(
        "books.Book",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    related_loan = models.ForeignKey(
        "loans.Loan",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read"]),
        ]

    def __str__(self):
        return f"[{self.notification_type}] {self.title} -> {self.recipient}"
