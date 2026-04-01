"""Modulo de checkout para abrir URLs de pago de VenePagos."""

import webbrowser
from typing import Optional
from urllib.parse import urlencode, urlparse, urlunparse, parse_qs

from .exceptions import VenePagosError


class VenePagosCheckout:
    """Clase para abrir el checkout de VenePagos en distintos modos.

    Modos disponibles:

    - ``"popup"``: Abre la URL en una ventana pequena del navegador.
    - ``"new_tab"``: Abre la URL en una nueva pestana del navegador por defecto.
    - ``"redirect"``: Retorna la URL con ``returnUrl`` como query param
      (para redirecciones del lado del servidor).

    Ejemplo::

        checkout = VenePagosCheckout()

        # Popup
        checkout.open_checkout(payment_url, mode="popup")

        # Nueva pestana
        checkout.open_checkout(payment_url, mode="new_tab")

        # Redireccion (retorna URL)
        redirect_url = checkout.open_checkout(
            payment_url,
            mode="redirect",
            return_url="https://mi-sitio.com/gracias",
        )
    """

    VALID_MODES = ("popup", "new_tab", "redirect")

    def open_checkout(
        self,
        url: str,
        mode: str = "popup",
        return_url: Optional[str] = None,
    ) -> Optional[str]:
        """Abre el checkout de VenePagos.

        Args:
            url: URL de la pagina de pago.
            mode: Modo de apertura: ``"popup"``, ``"new_tab"`` o ``"redirect"``.
            return_url: URL de retorno tras el pago (solo para modo ``"redirect"``).

        Returns:
            En modo ``"redirect"`` retorna la URL completa con ``returnUrl``.
            En los demas modos retorna ``None``.

        Raises:
            VenePagosError: Si el modo no es valido.
        """
        if mode not in self.VALID_MODES:
            raise VenePagosError(
                f"Modo de checkout no soportado: {mode!r}. "
                f"Use uno de: {', '.join(self.VALID_MODES)}"
            )

        if mode == "popup":
            return self._open_popup(url)
        elif mode == "new_tab":
            return self._open_new_tab(url)
        else:
            return self._open_redirect(url, return_url)

    # -------------------------------------------------------------------
    # Modo: popup
    # -------------------------------------------------------------------

    @staticmethod
    def _open_popup(url: str) -> None:
        """Abre la URL en una ventana nueva del navegador (simula popup)."""
        # webbrowser.open con new=1 intenta abrir una nueva ventana
        webbrowser.open(url, new=1)
        return None

    # -------------------------------------------------------------------
    # Modo: new_tab
    # -------------------------------------------------------------------

    @staticmethod
    def _open_new_tab(url: str) -> None:
        """Abre la URL en una nueva pestana del navegador por defecto."""
        # webbrowser.open con new=2 intenta abrir una nueva pestana
        webbrowser.open(url, new=2)
        return None

    # -------------------------------------------------------------------
    # Modo: redirect
    # -------------------------------------------------------------------

    @staticmethod
    def _open_redirect(url: str, return_url: Optional[str] = None) -> str:
        """Retorna la URL con returnUrl como query parameter.

        Args:
            url: URL base de pago.
            return_url: URL de retorno tras el pago.

        Returns:
            URL completa lista para redireccion.
        """
        if not return_url:
            return url

        parsed = urlparse(url)
        query_params = parse_qs(parsed.query)
        query_params["returnUrl"] = [return_url]

        # Rebuild query string
        flat_params = {}
        for k, v_list in query_params.items():
            flat_params[k] = v_list[0] if len(v_list) == 1 else v_list

        new_query = urlencode(flat_params, doseq=True)
        new_url = urlunparse(
            (
                parsed.scheme,
                parsed.netloc,
                parsed.path,
                parsed.params,
                new_query,
                parsed.fragment,
            )
        )
        return new_url
