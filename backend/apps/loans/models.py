from django.db import models
from core.mixins import TimestampMixin


class BorrowRequest(TimestampMixin, models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "En attente"
        APPROVED = "approved", "Approuvé"
        REJECTED = "rejected", "Rejeté"
        CANCELLED = "cancelled", "Annulé"

    employee = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="borrow_requests",
    )
    book = models.ForeignKey(
        "books.Book",
        on_delete=models.CASCADE,
        related_name="borrow_requests",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    desired_return_date = models.DateField(blank=True, null=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(blank=True, null=True)
    reviewed_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_requests",
    )
    rejection_reason = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "borrow_requests"
        ordering = ["-requested_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "book"],
                condition=models.Q(status="pending"),
                name="unique_pending_request_per_book",
            )
        ]

    def __str__(self):
        return f"{self.employee} -> {self.book} [{self.status}]"


class Loan(TimestampMixin, models.Model):
    employee = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="loans",
    )
    book = models.ForeignKey(
        "books.Book",
        on_delete=models.CASCADE,
        related_name="loans",
    )
    borrow_request = models.OneToOneField(
        BorrowRequest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="loan",
    )
    borrowed_at = models.DateTimeField(auto_now_add=True)
    due_date = models.DateField()
    returned_at = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "loans"
        ordering = ["-borrowed_at"]
        indexes = [
            models.Index(fields=["returned_at"]),
            models.Index(fields=["due_date"]),
        ]

    def __str__(self):
        status_label = "Actif" if self.returned_at is None else "Retourné"
        return f"{self.employee} - {self.book} ({status_label})"

    @property
    def is_active(self):
        return self.returned_at is None

    @property
    def is_overdue(self):
        from django.utils import timezone

        return self.returned_at is None and self.due_date < timezone.now().date()


class ExtensionRequest(TimestampMixin, models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "En attente"
        APPROVED = "approved", "Approuvé"
        REJECTED = "rejected", "Rejeté"

    loan = models.ForeignKey(
        Loan,
        on_delete=models.CASCADE,
        related_name="extension_requests",
    )
    requested_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="extension_requests",
    )
    new_due_date = models.DateField()
    reason = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    reviewed_at = models.DateTimeField(blank=True, null=True)
    reviewed_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_extensions",
    )
    rejection_reason = models.TextField(blank=True, default="")

    class Meta:
        db_table = "extension_requests"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Extension {self.loan} -> {self.new_due_date} [{self.status}]"
