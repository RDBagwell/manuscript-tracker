<?php

namespace App\Http\Requests;

use App\Enums\TemplateType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTemplateRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::enum(TemplateType::class)],
            'manuscript_id' => [
                'nullable', 'integer',
                Rule::exists('manuscripts', 'id')->where('user_id', $this->user()->id),
            ],
            'body' => ['required', 'string'],
        ];
    }
}
