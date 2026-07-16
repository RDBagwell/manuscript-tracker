<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateProfileRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => [
                'sometimes', 'required', 'string', 'email', 'max:255',
                Rule::unique('users', 'email')->ignore($this->user()->id),
            ],
            // Session auth lives on the web guard, so verify against it
            // explicitly rather than whatever the default resolves to.
            'current_password' => ['required_with:password', 'current_password:web'],
            'password' => ['sometimes', 'required', 'confirmed', Password::defaults()],
        ];
    }
}
