<?php

namespace VenePagos\Exceptions;

use Exception;

class VenePagosException extends Exception
{
    /** @var array|null */
    protected $responseBody;

    /**
     * @param string $message
     * @param int $code
     * @param array|null $responseBody
     * @param \Throwable|null $previous
     */
    public function __construct(
        string $message = '',
        int $code = 0,
        ?array $responseBody = null,
        ?\Throwable $previous = null
    ) {
        $this->responseBody = $responseBody;
        parent::__construct($message, $code, $previous);
    }

    /**
     * @return array|null
     */
    public function getResponseBody(): ?array
    {
        return $this->responseBody;
    }
}
