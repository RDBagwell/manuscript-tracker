<?php

namespace App\Policies;

use App\Models\Agency;
use App\Models\User;

class AgencyPolicy
{
    public function view(User $user, Agency $model): bool
    {
        return $user->id === $model->user_id;
    }

    public function update(User $user, Agency $model): bool
    {
        return $user->id === $model->user_id;
    }

    public function delete(User $user, Agency $model): bool
    {
        return $user->id === $model->user_id;
    }
}
