<?php

namespace App\Enums;

enum ManuscriptStatus: string
{
    case Drafting = 'drafting';
    case Querying = 'querying';
    case Production = 'production';
    case Published = 'published';
    case Shelved = 'shelved';

    public function label(): string
    {
        return match ($this) {
            self::Drafting => 'Drafting',
            self::Querying => 'Querying',
            self::Production => 'In Production',
            self::Published => 'Published',
            self::Shelved => 'Shelved',
        };
    }
}
