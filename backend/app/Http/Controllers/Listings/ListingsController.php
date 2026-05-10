<?php

namespace App\Http\Controllers\Listings;

use App\Models\Listing;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Http\Resources\ListingResource;
use Illuminate\Support\Facades\Storage;
use App\Http\Requests\StoreListingRequest;
use App\Http\Requests\UpdateListingRequest;

class ListingsController extends Controller
{
    public function __construct()
    {
        $this->authorizeResource(Listing::class);
    }

    public function index()
    {
        $listings = Listing::where('user_id', auth()->id())
            ->with('category')
            ->latest()
            ->get();

        return ListingResource::collection($listings);
    }

    public function store(StoreListingRequest $request)
    {
        $imagePaths = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                $imagePaths[] = $image->store('listings', 'public');
            }
        }

        $listing = Listing::create([
            ...$request->validated(),
            'user_id' => auth()->id(),
            'images' => $imagePaths
        ]);

        return ListingResource::make($listing->load('category'));
    }

    public function show(Listing $listing)
    {
        return ListingResource::make($listing->load('category'));
    }

    public function update(UpdateListingRequest $request, Listing $listing)
    {
        $data = $request->validated();
        $existingImages = $listing->images ?? [];

        if ($request->has('deleted_images')) {
            $deletedImages = array_map(function ($imageUrl) {
                // Remove the base URL to get just the path
                $baseUrl = asset('/');
                return str_replace($baseUrl, '', $imageUrl);
            }, $request->input('deleted_images'));

            foreach ($deletedImages as $imagePath) {
                if (Storage::disk('public')->exists($imagePath)) {
                    Storage::disk('public')->delete($imagePath);
                }
            }

            $existingImages = array_values(array_diff($existingImages, $deletedImages));
        }

        if ($request->hasFile('images')) {
            $newImagePaths = [];
            foreach ($request->file('images') as $image) {
                $newImagePaths[] = $image->store('listings', 'public');
            }
            $existingImages = array_merge($existingImages, $newImagePaths);
        }

        $data['images'] = $existingImages;
        $listing->update($data);

        return ListingResource::make($listing->load('category'));
    }

    public function destroy(Listing $listing)
    {
        foreach ($listing->images as $imagePath) {
            if (Storage::disk('public')->exists($imagePath)) {
                Storage::disk('public')->delete($imagePath);
            }
        }
        $listing->delete();
    }
}
