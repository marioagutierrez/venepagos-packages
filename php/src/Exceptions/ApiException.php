<?php

namespace VenePagos\Exceptions;

class ApiException extends VenePagosException
{
    /** @var int */
    protected $statusCode;

    /**
     * @param string $message
     * @param int $statusCode
     * @param array|null $responseBody
     * @param \Throwable|null $previous
     */
    public function __construct(
        string $message = 'Error en la API de VenePagos',
        int $statusCode = 500,
        ?array $responseBody = null,
        ?\Throwable $previous = null
    ) {
        $this->statusCode = $statusCode;
        parent::__construct($message, $statusCode, $responseBody, $previous);
    }

    /**
     * @return int
     */
    public function getStatusCode(): int
    {
        return $this->statusCode;
    }
}
