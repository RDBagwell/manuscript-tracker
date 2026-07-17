<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReminderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'remindable_type' => $this->remindable_type,
            'remindable_id' => $this->remindable_id,
            'target' => $this->targetLabel(),
            'due_at' => $this->due_at?->toISOString(),
            'due_in_days' => (int) round(
                now()->startOfDay()->diffInDays($this->due_at->copy()->startOfDay(), false),
            ),
            'is_due' => $this->isDue(),
            'reason' => $this->reason,
            'notes' => $this->notes,
            'completed_at' => $this->completed_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
