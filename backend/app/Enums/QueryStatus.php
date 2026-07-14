<?php

namespace App\Enums;

enum QueryStatus: string
{
    case Queued = 'queued';
    case Sent = 'sent';
    case Partial = 'partial';
    case Full = 'full';
    case ReviseResubmit = 'revise_resubmit';
    case Offer = 'offer';
    case Rejected = 'rejected';
    case NoResponse = 'no_response';
    case Withdrawn = 'withdrawn';

    /**
     * Terminal states. An Offer keeps the thread open (calls, nudging
     * other agents, acceptance) so it is deliberately not closed.
     */
    public function isClosed(): bool
    {
        return match ($this) {
            self::Rejected, self::NoResponse, self::Withdrawn => true,
            default => false,
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Queued => 'Queued',
            self::Sent => 'Sent',
            self::Partial => 'Partial Requested',
            self::Full => 'Full Requested',
            self::ReviseResubmit => 'Revise & Resubmit',
            self::Offer => 'Offer',
            self::Rejected => 'Rejected',
            self::NoResponse => 'Closed — No Response',
            self::Withdrawn => 'Withdrawn',
        };
    }
}
