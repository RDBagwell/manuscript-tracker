<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\Request;

trait AppliesSorting
{
    /**
     * Whitelisted ?sort= & ?dir= handling for index endpoints. Unknown
     * fields silently fall back to the default — sorting is a
     * convenience, not a contract worth a 422.
     *
     * @param  \Illuminate\Database\Eloquent\Builder|\Illuminate\Database\Eloquent\Relations\Relation  $query
     * @param  list<string>  $allowed
     * @return \Illuminate\Database\Eloquent\Builder|\Illuminate\Database\Eloquent\Relations\Relation
     */
    protected function applySort(
        $query,
        Request $request,
        array $allowed,
        string $defaultField,
        string $defaultDir = 'desc',
    ) {
        $field = $request->query('sort');
        $field = in_array($field, $allowed, true) ? $field : $defaultField;

        $dir = match ($request->query('dir')) {
            'asc' => 'asc',
            'desc' => 'desc',
            default => $defaultDir,
        };

        return $query->orderBy($field, $dir);
    }
}
