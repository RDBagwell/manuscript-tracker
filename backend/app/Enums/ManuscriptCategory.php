<?php

namespace App\Enums;

enum ManuscriptCategory: string
{
    case Adult = 'adult';
    case YoungAdult = 'young_adult';
    case MiddleGrade = 'middle_grade';

    public function label(): string
    {
        return match ($this) {
            self::Adult => 'Adult',
            self::YoungAdult => 'Young Adult',
            self::MiddleGrade => 'Middle Grade',
        };
    }
}
