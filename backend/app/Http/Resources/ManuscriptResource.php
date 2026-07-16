<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ManuscriptResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'genre' => $this->genre,
            'category' => $this->category->value,
            'word_count' => $this->word_count,
            'status' => $this->status->value,
            'pitch' => $this->pitch,
            'notes' => $this->notes,
            'queries_count' => $this->whenCounted('queries'),
            'queries' => QueryResource::collection($this->whenLoaded('queries')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
