import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/auth';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-12-15.clover',
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    
    // ★重要：クライアントから送られてきたメールアドレスを優先的に使用
    // ボタンを押した時に送られてきたメアドを信じて決済を作成する
    let userEmail = body.email;
    let userId = body.userId;

    // クライアントからメールアドレスが送られてこない場合のみ、サーバー側のセッションを確認
    if (!userEmail) {
      console.log('[checkout] クライアントからメールアドレスが送られてきませんでした。サーバー側のセッションを確認します。');
      const session = await auth();
      userEmail = session?.user?.email;
      userId = (session?.user as any)?.id;
    } else {
      console.log('[checkout] クライアントから送られてきたメールアドレスを使用:', userEmail);
    }

    if (!userEmail) {
      console.error('[checkout] メールアドレスが取得できませんでした');
      return NextResponse.json({ error: 'ログインが必要です（メールアドレス不明）' }, { status: 401 });
    }

    // 3. Stripeセッション作成
    const origin = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    // 環境変数からPrice IDを読み込む（Vercel上では本番用、ローカルではテスト用を自動で使い分け）
    const priceId = process.env.STRIPE_PRICE_ID!; 

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      client_reference_id: userId,
      metadata: {
        userId: userId,
        email: userEmail,
      },
      customer_email: userEmail,
    });

    return NextResponse.json({ url: checkoutSession.url });

  } catch (err: any) {
    console.error('Checkout Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
