<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAgencyRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => [
                'required', 'string', 'max:255',
                Rule::unique('agencies', 'name')->where('user_id', $this->user()->id),
            ],
            'website' => ['nullable', 'string', 'max:255'],
            'one_no_means_all_no' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
