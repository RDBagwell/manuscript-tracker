<?php

namespace App\Enums;

enum SubmissionMethod: string
{
    case QueryManager = 'query_manager';
    case Email = 'email';
    case Form = 'form';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::QueryManager => 'QueryManager',
            self::Email => 'Email',
            self::Form => 'Website Form',
            self::Other => 'Other',
        };
    }
}
