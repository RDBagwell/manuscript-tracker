<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AgentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'agency_id' => $this->agency_id,
            'name' => $this->name,
            'email' => $this->email,
            'title' => $this->title,
            'open_to_queries' => $this->open_to_queries,
            'genres' => $this->genres,
            'mswl' => $this->mswl,
            'submission_method' => $this->submission_method?->value,
            'guidelines' => $this->guidelines,
            'response_window_days' => $this->response_window_days,
            'links' => $this->links,
            'notes' => $this->notes,
            'agency' => new AgencyResource($this->whenLoaded('agency')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
