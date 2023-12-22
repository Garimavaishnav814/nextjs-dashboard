'use server';
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { signIn } from '@/auth';
// import { log } from 'console';

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
      invalid_type_error:"please select customer ID "
    }),
    amount: z.coerce.number().gt(0,{message:"amount should be greater then 0"}),
    status: z.enum(['pending', 'paid'],{
      invalid_type_error:"Please select an invoice status"
    }),
    date: z.string(),
  });
  
const CreateInvoice = FormSchema.omit({ id: true, date: true });
export async function createInvoice(prevState: State, formData: FormData) {
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
      });
      if (!validatedFields.success) {
        // console.log(validatedFields.error.flatten().fieldErrors,"validatedFields");
        
        return {
          errors: validatedFields.error.flatten().fieldErrors,
          message: 'Missing Fields. Failed to Create Invoice.',
        };
      }
      // Test it out:
      const { customerId, amount, status } = validatedFields.data;
      const amountInCents = amount * 100;
      const date = new Date().toISOString().split('T')[0];
      try {
        await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
      `;
      } catch (error) {
        return {
          massgae:"somthing was going worng in create Invoice"
        }
      }
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}
const UpdateInvoice = FormSchema.omit({ id: true, date: true });
export async function updateInvoice(id: string, prevState: State, formData: FormData) {
  const UpdateValidatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  if (!UpdateValidatedFields.success) {
    console.log(UpdateValidatedFields.error.flatten().fieldErrors,"UpdateValidatedFields");
    
    return {
      errors: UpdateValidatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    };
  }
  const { customerId, amount, status } = UpdateValidatedFields.data;
  const amountInCents = amount * 100;
 
  try {
    await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;
  } catch (error) {
    return {
      massgae:"somthing was going worng in update Invoice"
    }
  }
 
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}
export async function deleteInvoice(id: string) {
  // throw new Error('Failed to Delete Invoice');
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');
    return {messgae:"Delete Invoice"}
  } catch (error) {
    return {
      massgae:"somthing was going worng in update Invoice"
    }
  }
}
export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    // console.log("run This");
    await signIn('credentials', formData);
    // console.log(signData);
    
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}