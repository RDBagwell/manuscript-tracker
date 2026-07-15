<?php

namespace App\Http\Requests;

use App\Enums\ManuscriptCategory;
use App\Enums\ManuscriptStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreManuscriptRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'genre' => ['nullable', 'string', 'max:255'],
            'category' => ['sometimes', Rule::enum(ManuscriptCategory::class)],
            'word_count' => ['nullable', 'integer', 'min:0'],
            'status' => ['sometimes', Rule::enum(ManuscriptStatus::class)],
            'pitch' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
