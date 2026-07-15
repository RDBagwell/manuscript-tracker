<?php

namespace App\Http\Requests;

use App\Enums\ManuscriptCategory;
use App\Enums\ManuscriptStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateManuscriptRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'genre' => ['sometimes', 'nullable', 'string', 'max:255'],
            'category' => ['sometimes', Rule::enum(ManuscriptCategory::class)],
            'word_count' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'status' => ['sometimes', Rule::enum(ManuscriptStatus::class)],
            'pitch' => ['sometimes', 'nullable', 'string'],
            'notes' => ['sometimes', 'nullable', 'string'],
        ];
    }
}
