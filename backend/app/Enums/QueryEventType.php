<?php

namespace App\Enums;

enum QueryEventType: string
{
    case Sent = 'sent';
    case PartialRequested = 'partial_requested';
    case MaterialsSent = 'materials_sent';
    case FullRequested = 'full_requested';
    case ReviseResubmit = 'revise_resubmit';
    case Offer = 'offer';
    case RejectedForm = 'rejected_form';
    case RejectedPersonal = 'rejected_personal';
    case Nudged = 'nudged';
    case ClosedNoResponse = 'closed_no_response';
    case Withdrawn = 'withdrawn';

    /**
     * The cached Query.status this event produces.
     * Null means the event is informational and leaves status untouched
     * (a nudge doesn't change where you stand; sending requested
     * materials doesn't either — the request already did).
     */
    public function resultingStatus(): ?QueryStatus
    {
        return match ($this) {
            self::Sent => QueryStatus::Sent,
            self::PartialRequested => QueryStatus::Partial,
            self::FullRequested => QueryStatus::Full,
            self::ReviseResubmit => QueryStatus::ReviseResubmit,
            self::Offer => QueryStatus::Offer,
            self::RejectedForm, self::RejectedPersonal => QueryStatus::Rejected,
            self::ClosedNoResponse => QueryStatus::NoResponse,
            self::Withdrawn => QueryStatus::Withdrawn,
            self::MaterialsSent, self::Nudged => null,
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Sent => 'Query Sent',
            self::PartialRequested => 'Partial Requested',
            self::MaterialsSent => 'Materials Sent',
            self::FullRequested => 'Full Requested',
            self::ReviseResubmit => 'Revise & Resubmit',
            self::Offer => 'Offer of Representation',
            self::RejectedForm => 'Rejection (Form)',
            self::RejectedPersonal => 'Rejection (Personalized)',
            self::Nudged => 'Nudge Sent',
            self::ClosedNoResponse => 'Closed — No Response',
            self::Withdrawn => 'Withdrawn',
        };
    }
}
