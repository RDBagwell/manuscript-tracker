<?php

namespace App\Enums;

enum TemplateType: string
{
    case QueryLetter = 'query_letter';
    case Synopsis = 'synopsis';
    case Bio = 'bio';

    public function label(): string
    {
        return match ($this) {
            self::QueryLetter => 'Query Letter',
            self::Synopsis => 'Synopsis',
            self::Bio => 'Bio',
        };
    }
}
