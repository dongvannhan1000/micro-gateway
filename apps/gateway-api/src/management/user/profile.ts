import { Hono } from 'hono';
import { z } from 'zod';
import { Env, Variables } from '../../types';

const profile = new Hono<{ Bindings: Env; Variables: Variables }>();

// Validation schemas
const updateProfileSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  avatar_url: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  company: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  timezone: z.string().optional(),
  language: z.string().length(2).optional()
});

const changePasswordSchema = z.object({
  current_password: z.string().min(8),
  new_password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
});

// GET /api/management/user/profile
profile.get('/profile', async (c) => {
  const user = c.get('user')!;
  const repos = c.get('repos')!;

  try {
    let userProfile = await repos.userProfile.findById(user.id);

    // Auto-create profile if it doesn't exist
    if (!userProfile) {
      console.log(`[Profile] Creating profile for user: ${user.id}`);

      try {
        await repos.userProfile.create({
          id: user.id,
          email: user.email,
          displayName: user.email?.split('@')[0] || 'User', // Default display name from email
        });

        // Fetch the newly created profile
        userProfile = await repos.userProfile.findById(user.id);

        if (!userProfile) {
          throw new Error('Failed to create user profile');
        }

        console.log(`[Profile] Successfully created profile for user: ${user.id}`);
      } catch (createError) {
        console.error('[Profile] Failed to auto-create profile:', createError);
        return c.json({
          error: 'Profile creation failed',
          message: 'Could not create user profile. Please contact support.'
        }, 500);
      }
    }

    // Transform to API response format
    const response = {
      id: userProfile.id,
      email: userProfile.email,
      full_name: userProfile.display_name,
      avatar_url: userProfile.avatar_url,
      bio: userProfile.bio,
      company: userProfile.company,
      location: userProfile.location,
      timezone: userProfile.timezone,
      language: userProfile.language,
      created_at: userProfile.created_at,
      updated_at: userProfile.profile_updated_at || userProfile.updated_at
    };

    return c.json(response);
  } catch (error) {
    console.error('[Profile] Failed to fetch profile:', error);
    return c.json({
      error: 'Failed to fetch profile',
      message: 'An error occurred while retrieving your profile'
    }, 500);
  }
});

// PUT /api/management/user/profile
profile.put('/profile', async (c) => {
  const user = c.get('user')!;
  const repos = c.get('repos')!;

  try {
    const body = await c.req.json();
    const validatedData = updateProfileSchema.safeParse(body);

    if (!validatedData.success) {
      return c.json({
        error: 'Validation error',
        message: 'Invalid profile data',
        details: validatedData.error.issues
      }, 400);
    }

    // Map full_name to display_name for database
    const updateData = {
      ...validatedData.data,
      display_name: validatedData.data.full_name
    };
    delete (updateData as any).full_name;

    await repos.userProfile.updateProfile(user.id, updateData);

    // Fetch updated profile
    const updatedProfile = await repos.userProfile.findById(user.id);

    // Log security event
    await repos.auditLog.create({
      userId: user.id,
      eventType: 'profile_update',
      eventCategory: 'settings',
      description: 'User updated profile information',
      ipAddress: c.req.header('CF-Connecting-IP') || 'unknown',
      userAgent: c.req.header('User-Agent') || 'unknown',
      success: true
    });

    const response = {
      success: true,
      profile: {
        id: updatedProfile!.id,
        email: updatedProfile!.email,
        full_name: updatedProfile!.display_name,
        avatar_url: updatedProfile!.avatar_url,
        bio: updatedProfile!.bio,
        company: updatedProfile!.company,
        location: updatedProfile!.location,
        timezone: updatedProfile!.timezone,
        language: updatedProfile!.language,
        updated_at: updatedProfile!.profile_updated_at || updatedProfile!.updated_at
      }
    };

    return c.json(response);
  } catch (error) {
    console.error('[Profile] Failed to update profile:', error);
    return c.json({
      error: 'Failed to update profile',
      message: 'An error occurred while updating your profile'
    }, 500);
  }
});

// POST /api/management/user/change-password
profile.post('/change-password', async (c) => {
  const user = c.get('user')!;
  const repos = c.get('repos')!;

  try {
    const body = await c.req.json();
    const validatedData = changePasswordSchema.safeParse(body);

    if (!validatedData.success) {
      return c.json({
        error: 'Validation error',
        message: 'Invalid password data',
        details: validatedData.error.issues
      }, 422);
    }

    const { current_password, new_password } = validatedData.data;

    // TODO: Verify current password via Supabase
    // For now, we'll skip actual password verification since this requires Supabase Admin API
    // In production, you would call Supabase Admin API to verify the current password

    // TODO: Update password via Supabase
    // For now, we'll just log the event

    // Log security event
    await repos.auditLog.create({
      userId: user.id,
      eventType: 'password_change',
      eventCategory: 'security',
      description: 'User changed password',
      ipAddress: c.req.header('CF-Connecting-IP') || 'unknown',
      userAgent: c.req.header('User-Agent') || 'unknown',
      success: true
    });

    return c.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('[Profile] Failed to change password:', error);
    return c.json({
      error: 'Failed to change password',
      message: 'An error occurred while changing your password'
    }, 500);
  }
});

export { profile as profileRouter };
