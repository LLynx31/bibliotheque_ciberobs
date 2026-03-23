from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class User(AbstractUser):
    class Role(models.TextChoices):
        EMPLOYEE = "employee", "Employé"
        BOOK_MANAGER = "book_manager", "Gestionnaire livres"
        REQUEST_MANAGER = "request_manager", "Gestionnaire demandes"
        ADMIN = "admin", "Administrateur"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.EMPLOYEE,
    )

    objects = UserManager()

    class Meta:
        db_table = "users"
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.last_name} {self.first_name} ({self.username})"

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    @property
    def can_manage_books(self):
        return self.role in (self.Role.ADMIN, self.Role.BOOK_MANAGER)

    @property
    def can_manage_requests(self):
        return self.role in (self.Role.ADMIN, self.Role.REQUEST_MANAGER)
