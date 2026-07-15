<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreQueryRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'manuscript_id' => [
                'required', 'integer',
                Rule::exists('manuscripts', 'id')->where('user_id', $this->user()->id),
            ],
            'agent_id' => [
                'required', 'integer',
                Rule::exists('agents', 'id')->where('user_id', $this->user()->id),
                // One thread per (manuscript, agent) — mirrors the DB unique
                // constraint so violations surface as 422s, not 500s.
                Rule::unique('queries', 'agent_id')->where(
                    fn ($query) => $query->where('manuscript_id', $this->integer('manuscript_id')),
                ),
            ],
            'personalization' => ['nullable', 'string'],
            'materials' => ['nullable', 'string'],
            'wave' => ['nullable', 'integer', 'min:1', 'max:100'],
            'sent_at' => ['nullable', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'agent_id.unique' => 'A query thread for this manuscript and agent already exists.',
        ];
    }
}
