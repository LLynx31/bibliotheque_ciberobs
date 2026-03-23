from django.db import models
from core.mixins import TimestampMixin


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = "categories"
        ordering = ["name"]
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name


class Book(TimestampMixin, models.Model):
    class Availability(models.TextChoices):
        AVAILABLE = "available", "Disponible"
        BORROWED = "borrowed", "Emprunté"
        RESERVED = "reserved", "Réservé"

    title = models.CharField(max_length=300)
    author = models.CharField(max_length=200)
    edition = models.CharField(max_length=100, blank=True, null=True)
    publisher = models.CharField(max_length=200, blank=True, null=True)
    year_published = models.PositiveIntegerField(blank=True, null=True)
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="books",
    )
    description = models.TextField(blank=True, null=True)
    cover_image = models.ImageField(upload_to="book_covers/", blank=True, null=True)
    number_of_copies = models.PositiveIntegerField(default=1)
    availability = models.CharField(
        max_length=20,
        choices=Availability.choices,
        default=Availability.AVAILABLE,
    )

    class Meta:
        db_table = "books"
        ordering = ["title"]
        indexes = [
            models.Index(fields=["title"]),
            models.Index(fields=["author"]),
            models.Index(fields=["availability"]),
        ]

    def __str__(self):
        return f"{self.title} - {self.author}"

    @property
    def is_available(self):
        active_loans = self.loans.filter(returned_at__isnull=True).count()
        return active_loans < self.number_of_copies

    def update_availability(self):
        if self.is_available:
            self.availability = self.Availability.AVAILABLE
        else:
            self.availability = self.Availability.BORROWED
        self.save(update_fields=["availability", "updated_at"])
