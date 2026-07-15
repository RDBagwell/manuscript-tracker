<?php

namespace App\Policies;

use App\Models\Agent;
use App\Models\User;

class AgentPolicy
{
    public function view(User $user, Agent $model): bool
    {
        return $user->id === $model->user_id;
    }

    public function update(User $user, Agent $model): bool
    {
        return $user->id === $model->user_id;
    }

    public function delete(User $user, Agent $model): bool
    {
        return $user->id === $model->user_id;
    }
}
