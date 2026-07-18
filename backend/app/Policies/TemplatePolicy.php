<?php

namespace App\Policies;

use App\Models\Template;
use App\Models\User;

class TemplatePolicy
{
    public function view(User $user, Template $template): bool
    {
        return $user->id === $template->user_id;
    }

    public function update(User $user, Template $template): bool
    {
        return $user->id === $template->user_id;
    }

    public function delete(User $user, Template $template): bool
    {
        return $user->id === $template->user_id;
    }
}
