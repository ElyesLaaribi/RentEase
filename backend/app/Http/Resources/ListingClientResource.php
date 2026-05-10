<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ListingClientResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'price' => $this->price,
            'description' => $this->description,
            'images' => collect($this->images ?? [])->map(function ($image) {
                return $image ? (str_starts_with($image, 'http') ? $image : asset('storage/' . $image)) : null;
            })->filter(),
            'category_id' => $this->category_id,
            'cat_title' => optional($this->category)->cat_title,
            'user_id' => $this->user_id,
            'user_name' => optional($this->user)->name,
            'phone' => optional($this->user)->phone,
            'joined_since' => optional($this->user)->created_at->format('Y-m-d'),
            'address' => $this->address,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
        ];
    }
}
