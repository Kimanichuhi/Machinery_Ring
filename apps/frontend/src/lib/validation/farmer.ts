import { z } from 'zod';

/**
 * Mirrors the validation FarmerFormDialog enforced manually before this
 * migration: name/phone/localMrId/sub_county are required, everything else
 * is optional with no format constraints (so existing data that was
 * previously accepted still is).
 */
export const farmerFormSchema = z.object({
  name: z.string().trim().min(1, 'Full name is required'),
  phone: z.string().trim().min(1, 'Phone number is required'),
  email: z.string().trim().optional(),
  localMrId: z.string().min(1, 'Local MR is required'),
  sub_county: z.string().min(1, 'Sub-County is required'),
  ward: z.string().optional(),
  village: z.string().optional(),
  farming_type: z.string().optional(),
  gender: z.string().optional(),
  farm_size: z.string().optional(),
});

export type FarmerFormValues = z.infer<typeof farmerFormSchema>;

export const emptyFarmerFormValues: FarmerFormValues = {
  name: '',
  phone: '',
  email: '',
  localMrId: '',
  sub_county: '',
  ward: '',
  village: '',
  farming_type: '',
  gender: '',
  farm_size: '',
};
