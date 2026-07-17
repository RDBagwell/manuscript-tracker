<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_creates_and_authenticates_a_user(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Robert Bagwell',
            'email' => 'robert@example.test',
            'password' => 'a-strong-password',
            'password_confirmation' => 'a-strong-password',
        ]);

        $response->assertCreated()->assertJsonPath('data.email', 'robert@example.test');
        $this->assertAuthenticated();
        $this->assertDatabaseHas('users', ['email' => 'robert@example.test']);
    }

    public function test_login_succeeds_with_valid_credentials(): void
    {
        $user = User::factory()->create();

        $response = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $response->assertOk()->assertJsonPath('data.id', $user->id);
        $this->assertAuthenticatedAs($user);
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        $user = User::factory()->create();

        $response = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->assertGuest();
    }

    /**
     * The full SPA flow: a request carrying a stateful Origin gets
     * session-cookie auth on subsequent api calls — no bearer token.
     */
    public function test_stateful_spa_flow_authenticates_via_session(): void
    {
        $user = User::factory()->create();

        $this->withHeader('Origin', 'http://localhost:3000')
            ->postJson('/api/auth/login', [
                'email' => $user->email,
                'password' => 'password',
            ])->assertOk();

        $this->withHeader('Origin', 'http://localhost:3000')
            ->getJson('/api/auth/user')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id);
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/api/auth/user')->assertUnauthorized();
        $this->getJson('/api/manuscripts')->assertUnauthorized();
    }

    public function test_logout_invalidates_the_session(): void
    {
        $user = User::factory()->create();

        $this->withHeader('Origin', 'http://localhost:3000')
            ->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'password'])
            ->assertOk();

        $this->withHeader('Origin', 'http://localhost:3000')
            ->postJson('/api/auth/logout')
            ->assertNoContent();

        $this->assertGuest('web');
    }

    public function test_profile_update_changes_name_and_email(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/auth/login', [
            'email' => $user->email, 'password' => 'password',
        ])->assertOk();

        $this->putJson('/api/auth/user', [
            'name' => 'Renamed Author',
            'email' => 'renamed@example.test',
        ])->assertOk()->assertJsonPath('data.name', 'Renamed Author');

        $this->assertSame('renamed@example.test', $user->fresh()->email);
    }

    public function test_profile_email_must_stay_unique(): void
    {
        User::factory()->create(['email' => 'taken@example.test']);
        $user = User::factory()->create();

        $this->postJson('/api/auth/login', [
            'email' => $user->email, 'password' => 'password',
        ]);

        $this->putJson('/api/auth/user', ['email' => 'taken@example.test'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_password_change_requires_current_password(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/auth/login', [
            'email' => $user->email, 'password' => 'password',
        ]);

        $this->putJson('/api/auth/user', [
            'current_password' => 'not-the-password',
            'password' => 'a-new-strong-password',
            'password_confirmation' => 'a-new-strong-password',
        ])->assertUnprocessable()->assertJsonValidationErrors('current_password');
    }

    public function test_password_change_succeeds_with_current_password(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/auth/login', [
            'email' => $user->email, 'password' => 'password',
        ]);

        $this->putJson('/api/auth/user', [
            'current_password' => 'password',
            'password' => 'a-new-strong-password',
            'password_confirmation' => 'a-new-strong-password',
        ])->assertOk();

        $this->assertTrue(Hash::check('a-new-strong-password', $user->fresh()->password));
    }

    public function test_forgot_password_sends_a_reset_link(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->postJson('/api/auth/forgot-password', ['email' => $user->email])
            ->assertOk();

        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_forgot_password_is_uniform_for_unknown_emails(): void
    {
        Notification::fake();

        $this->postJson('/api/auth/forgot-password', ['email' => 'ghost@example.test'])
            ->assertOk();

        Notification::assertNothingSent();
    }

    public function test_password_can_be_reset_with_a_valid_token(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->postJson('/api/auth/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPassword::class,
            function (ResetPassword $notification) use ($user): bool {
                $this->postJson('/api/auth/reset-password', [
                    'token' => $notification->token,
                    'email' => $user->email,
                    'password' => 'a-brand-new-password',
                    'password_confirmation' => 'a-brand-new-password',
                ])->assertOk();

                return true;
            });

        $this->assertTrue(Hash::check('a-brand-new-password', $user->fresh()->password));
    }

    public function test_reset_fails_with_an_invalid_token(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/auth/reset-password', [
            'token' => 'not-a-real-token',
            'email' => $user->email,
            'password' => 'whatever-strong-1',
            'password_confirmation' => 'whatever-strong-1',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');
    }
}
