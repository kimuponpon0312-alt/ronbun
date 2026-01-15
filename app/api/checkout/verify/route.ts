import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-12-15.clover',
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { session_id } = body;

    if (!session_id) {
      console.error('[verify] パラメータエラー: session_idがありません');
      return NextResponse.json(
        { error: 'session_idが必要です' },
        { status: 400 }
      );
    }

    console.log('[verify] Stripeセッション取得開始:', session_id);

    // 1. Stripeから決済情報を取得
    const checkoutSession = await stripe.checkout.sessions.retrieve(session_id);

    console.log('[verify] Stripeセッション情報:', {
      payment_status: checkoutSession.payment_status,
      client_reference_id: checkoutSession.client_reference_id,
      metadata: checkoutSession.metadata,
      customer_email: checkoutSession.customer_email,
      customer_details: checkoutSession.customer_details,
    });

    if (checkoutSession.payment_status !== 'paid') {
      console.error('[verify] 決済未完了:', checkoutSession.payment_status);
      return NextResponse.json(
        { error: '決済が完了していません' },
        { status: 400 }
      );
    }

    // 2. メールアドレスを取得（優先順位: customer_details > customer_email > metadata）
    const email = checkoutSession.customer_details?.email 
      || checkoutSession.customer_email 
      || checkoutSession.metadata?.email 
      || checkoutSession.metadata?.userEmail;

    if (!email) {
      console.error('[verify] メールアドレスが取得できませんでした');
      return NextResponse.json(
        { 
          error: 'メールアドレスが取得できませんでした',
          debug: {
            customer_details: checkoutSession.customer_details,
            customer_email: checkoutSession.customer_email,
            metadata: checkoutSession.metadata,
          }
        },
        { status: 400 }
      );
    }

    // 3. ユーザーIDを取得または生成
    // client_reference_idがUUID形式の場合は使用、それ以外は新規生成
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let userId = checkoutSession.client_reference_id || checkoutSession.metadata?.userId;
    
    // UUID形式でない場合は新規生成
    if (!userId || !uuidRegex.test(userId)) {
      userId = randomUUID();
      console.log('[verify] UUIDを新規生成:', userId);
    } else {
      console.log('[verify] client_reference_idからUUIDを取得:', userId);
    }

    // 4. Supabase設定確認
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[verify] Supabase設定が不足しています');
      return NextResponse.json(
        { 
          error: 'Supabaseの設定が不足しています',
          debug: {
            supabaseUrl: !!supabaseUrl,
            supabaseServiceKey: !!supabaseServiceKey,
          }
        },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('[verify] Upsert処理開始:', {
      id: userId,
      email: email,
    });

    // 5. emailをキーにして、存在するか確認
    const { data: existingProfile, error: selectError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, plan')
      .eq('email', email)
      .maybeSingle();

    if (selectError) {
      console.warn('[verify] 既存プロフィール検索エラー（無視して続行）:', selectError);
    }

    let finalProfileData;

    if (existingProfile) {
      // 既に存在する場合：planを'pro'に更新
      console.log('[verify] 既存プロフィールが見つかりました。更新します:', existingProfile);
      
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ plan: 'pro' })
        .eq('email', email)
        .select('id, email, plan')
        .single();

      if (updateError) {
        console.error('[verify] 更新エラー:', updateError);
        return NextResponse.json(
          { 
            error: 'プランの更新に失敗しました',
            debug: {
              updateError: {
                message: updateError.message,
                code: updateError.code,
                details: updateError.details,
              },
              email,
            }
          },
          { status: 500 }
        );
      }

      finalProfileData = updatedProfile;
      console.log('[verify] プロフィール更新成功:', finalProfileData);
    } else {
      // 存在しない場合：新規作成（UUIDを生成してINSERT）
      console.log('[verify] プロフィールが存在しません。新規作成します');
      
      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId, // UUIDを必ず指定
          email: email,
          plan: 'pro',
        })
        .select('id, email, plan')
        .single();

      if (insertError) {
        console.error('[verify] 新規作成エラー:', insertError);
        return NextResponse.json(
          { 
            error: 'プランの更新に失敗しました（レコードが見つからず、作成も失敗）',
            debug: {
              insertError: {
                message: insertError.message,
                code: insertError.code,
                details: insertError.details,
              },
              userId,
              email,
              suggestion: 'Supabaseのprofilesテーブルの外部キー制約を削除してください。SQL: ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;',
            }
          },
          { status: 500 }
        );
      }

      finalProfileData = newProfile;
      console.log('[verify] プロフィール新規作成成功:', finalProfileData);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Proプランへの更新が完了しました',
      userId,
      email,
    });
  } catch (err: any) {
    console.error('[verify] 予期しないエラー:', {
      message: err.message,
      stack: err.stack,
      name: err.name,
    });
    return NextResponse.json(
      { 
        error: err.message || '予期しないエラーが発生しました',
        debug: {
          type: err.name,
          message: err.message,
        }
      },
      { status: 500 }
    );
  }
}
