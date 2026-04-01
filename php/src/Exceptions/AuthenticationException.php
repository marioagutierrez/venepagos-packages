<?php

namespace VenePagos\Exceptions;

class AuthenticationException extends VenePagosException
{
    /**
     * @param string $message
     * @param \Throwable|null $previous
     */
    public function __construct(string $message = 'API key inválida o no proporcionada', ?\Throwable $previous = null)
    {
        parent::__construct($message, 401, null, $previous);
    }
}
