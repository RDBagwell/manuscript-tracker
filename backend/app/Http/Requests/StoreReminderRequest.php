<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreReminderRequest extends FormRequest
{
    public function rules(): array
    {
        $table = match ($this->input('remindable_type')) {
            'query' => 'queries',
            'manuscript' => 'manuscripts',
            'agent' => 'agents',
            default => null,
        };

        return [
            'remindable_type' => ['required', Rule::in(['query', 'manuscript', 'agent'])],
            'remindable_id' => array_filter([
                'required', 'integer',
                $table ? Rule::exists($table, 'id')->where('user_id', $this->user()->id) : null,
            ]),
            'due_at' => ['required', 'date'],
            'reason' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
