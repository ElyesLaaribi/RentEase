<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReservationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'reservation_id' => $this->id,
            'listing_id' => $this->listing_id,
            'listing_name' => optional($this->listing)->name,
            'client_id' => $this->user_id,
            'client' => optional($this->user)->name,
            'lessor_id' => optional($this->listing)->user_id,
            'lessor' => optional($this->listing->user)->name,
            'start_date' => $this->start_date,
            'end_date' => $this->end_date,
            'images' => collect($this->listing->images ?? [])->map(function ($image) {
                return $image ? (str_starts_with($image, 'http') ? $image : asset('storage/' . $image)) : null;
            })->filter()->first(),
            'price' => $this->price,
        ];
    }
}
