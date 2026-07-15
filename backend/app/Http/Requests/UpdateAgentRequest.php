<?php

namespace App\Http\Requests;

use App\Enums\SubmissionMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAgentRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'agency_id' => [
                'sometimes', 'nullable', 'integer',
                Rule::exists('agencies', 'id')->where('user_id', $this->user()->id),
            ],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'open_to_queries' => ['sometimes', 'boolean'],
            'genres' => ['sometimes', 'nullable', 'array'],
            'genres.*' => ['string', 'max:100'],
            'mswl' => ['sometimes', 'nullable', 'string'],
            'submission_method' => ['sometimes', 'nullable', Rule::enum(SubmissionMethod::class)],
            'guidelines' => ['sometimes', 'nullable', 'string'],
            'response_window_days' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:730'],
            'links' => ['sometimes', 'nullable', 'array'],
            'links.*' => ['string', 'max:2048'],
            'notes' => ['sometimes', 'nullable', 'string'],
        ];
    }
}
