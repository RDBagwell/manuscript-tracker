<?php

namespace App\Http\Requests;

use App\Enums\SubmissionMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAgentRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'agency_id' => [
                'nullable', 'integer',
                Rule::exists('agencies', 'id')->where('user_id', $this->user()->id),
            ],
            'email' => ['nullable', 'email', 'max:255'],
            'title' => ['nullable', 'string', 'max:255'],
            'open_to_queries' => ['sometimes', 'boolean'],
            'genres' => ['nullable', 'array'],
            'genres.*' => ['string', 'max:100'],
            'mswl' => ['nullable', 'string'],
            'submission_method' => ['nullable', Rule::enum(SubmissionMethod::class)],
            'guidelines' => ['nullable', 'string'],
            'response_window_days' => ['nullable', 'integer', 'min:1', 'max:730'],
            'links' => ['nullable', 'array'],
            'links.*' => ['string', 'max:2048'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
