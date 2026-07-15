<?php

namespace App\Http\Requests;

use App\Enums\QueryEventType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreQueryEventRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::enum(QueryEventType::class)],
            'happened_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
