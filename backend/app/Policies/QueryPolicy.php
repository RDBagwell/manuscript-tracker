<?php

namespace App\Policies;

use App\Models\Query;
use App\Models\User;

class QueryPolicy
{
    public function view(User $user, Query $model): bool
    {
        return $user->id === $model->user_id;
    }

    public function update(User $user, Query $model): bool
    {
        return $user->id === $model->user_id;
    }

    public function delete(User $user, Query $model): bool
    {
        return $user->id === $model->user_id;
    }
}
