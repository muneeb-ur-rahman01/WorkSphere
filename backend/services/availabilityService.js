const supabase = require('../config/supabase');

const {
  serializeAvailability
} = require('../utils/serializers');

/*
|--------------------------------------------------------------------------
| Get Availability
|--------------------------------------------------------------------------
*/

const getAvailability = async ({ user }) => {
  let query = supabase
    .from('availability')
    .select('*, camps!inner(org_id)');

  /*
  |--------------------------------------------------------------------------
  | Organization isolation
  |--------------------------------------------------------------------------
  |
  | SuperAdmin can see all availability.
  | Everyone else can only see their own organization.
  |
  */

  if (user.role !== 'SuperAdmin') {
    if (!user.orgId) {
      return [];
    }

    query = query.eq(
      'camps.org_id',
      user.orgId
    );
  }

  const {
    data,
    error
  } = await query;

  if (error) {
    console.error(
      '[availabilityService] Get availability failed:',
      error.message
    );

    throw new Error(
      'Could not fetch availability.'
    );
  }

  return (data || []).map(
    serializeAvailability
  );
};

/*
|--------------------------------------------------------------------------
| Update Availability
|--------------------------------------------------------------------------
*/

const updateAvailability = async ({
  userId,
  campId,
  status
}) => {
  const {
    data,
    error
  } = await supabase
    .from('availability')
    .upsert(
      {
        camp_id: campId,
        user_id: userId,
        status,
        updated_at:
          new Date().toISOString()
      },
      {
        onConflict:
          'camp_id,user_id'
      }
    )
    .select()
    .single();

  if (error) {
    console.error(
      '[availabilityService] Update availability failed:',
      error.message
    );

    throw new Error(
      'Could not update availability.'
    );
  }

  return serializeAvailability(data);
};

module.exports = {
  getAvailability,
  updateAvailability
};