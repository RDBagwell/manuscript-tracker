<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QueryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'manuscript_id' => $this->manuscript_id,
            'agent_id' => $this->agent_id,
            'status' => $this->status->value,
            'personalization' => $this->personalization,
            'materials' => $this->materials,
            'wave' => $this->wave,
            'sent_at' => $this->sent_at?->toISOString(),
            'closed_at' => $this->closed_at?->toISOString(),
            'days_out' => $this->daysOut(),
            'manuscript' => new ManuscriptResource($this->whenLoaded('manuscript')),
            'agent' => new AgentResource($this->whenLoaded('agent')),
            'events' => QueryEventResource::collection($this->whenLoaded('events')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
