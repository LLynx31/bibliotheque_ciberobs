from django.db.models import Count, Q
from django.utils import timezone

from apps.books.models import Book
from apps.loans.models import Loan, BorrowRequest
from django.contrib.auth import get_user_model

User = get_user_model()


class DashboardController:
    @staticmethod
    def get_stats():
        now = timezone.now()
        return {
            "total_books": Book.objects.count(),
            "total_users": User.objects.filter(is_active=True).count(),
            "active_loans": Loan.objects.filter(returned_at__isnull=True).count(),
            "pending_requests": BorrowRequest.objects.filter(status="pending").count(),
            "overdue_loans": Loan.objects.filter(
                returned_at__isnull=True,
                due_date__lt=now.date(),
            ).count(),
        }

    @staticmethod
    def get_most_borrowed(limit=10):
        return list(
            Book.objects.annotate(borrow_count=Count("loans"))
            .filter(borrow_count__gt=0)
            .order_by("-borrow_count")
            .values("id", "title", "author", "borrow_count")[:limit]
        )

    @staticmethod
    def get_active_borrowers(limit=10):
        return list(
            User.objects.filter(loans__returned_at__isnull=True)
            .annotate(
                active_count=Count(
                    "loans", filter=Q(loans__returned_at__isnull=True)
                )
            )
            .order_by("-active_count")
            .values("id", "first_name", "last_name", "active_count")[:limit]
        )

    @staticmethod
    def get_recent_activity(limit=20):
        return Loan.objects.select_related("employee", "book").order_by(
            "-updated_at"
        )[:limit]
