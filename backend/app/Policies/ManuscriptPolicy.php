<?php

namespace App\Policies;

use App\Models\Manuscript;
use App\Models\User;

class ManuscriptPolicy
{
    public function view(User $user, Manuscript $model): bool
    {
        return $user->id === $model->user_id;
    }

    public function update(User $user, Manuscript $model): bool
    {
        return $user->id === $model->user_id;
    }

    public function delete(User $user, Manuscript $model): bool
    {
        return $user->id === $model->user_id;
    }
}
