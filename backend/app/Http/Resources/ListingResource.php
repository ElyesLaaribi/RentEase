<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ListingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'price' => $this->price,
            'description' => $this->description,
            'images' => collect($this->images ?? [])->map(fn($image) => str_starts_with($image, 'http') ? $image : asset('storage/' . $image))->filter(),
            'image_paths' => $this->images,
            'category_id' => $this->category_id,
            'user_id' => $this->user_id,
            'cat_title' => optional($this->category)->cat_title,
        ];
    }
}
