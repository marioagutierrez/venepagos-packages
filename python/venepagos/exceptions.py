"""Excepciones personalizadas del SDK de VenePagos."""

from typing import Any, Optional


class VenePagosError(Exception):
    """Error base del SDK de VenePagos."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class AuthenticationError(VenePagosError):
    """Error de autenticacion: API key invalida o ausente."""

    def __init__(self, message: str = "API key invalida o no proporcionada.") -> None:
        super().__init__(message)


class APIError(VenePagosError):
    """Error devuelto por la API de VenePagos."""

    def __init__(
        self,
        message: str,
        status_code: int,
        body: Optional[Any] = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.body = body

    def __str__(self) -> str:
        return f"APIError({self.status_code}): {self.message}"
