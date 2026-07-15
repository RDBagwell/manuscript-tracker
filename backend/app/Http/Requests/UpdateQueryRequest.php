<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateQueryRequest extends FormRequest
{
    /**
     * Status, sent_at, and closed_at are deliberately absent: those are
     * owned by the event machine (POST /queries/{query}/events).
     */
    public function rules(): array
    {
        return [
            'personalization' => ['sometimes', 'nullable', 'string'],
            'materials' => ['sometimes', 'nullable', 'string'],
            'wave' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
