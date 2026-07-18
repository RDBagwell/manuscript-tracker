<?php

namespace App\Http\Requests;

use App\Enums\TemplateType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTemplateRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'type' => ['sometimes', Rule::enum(TemplateType::class)],
            'manuscript_id' => [
                'sometimes', 'nullable', 'integer',
                Rule::exists('manuscripts', 'id')->where('user_id', $this->user()->id),
            ],
            'body' => ['sometimes', 'required', 'string'],
        ];
    }
}
