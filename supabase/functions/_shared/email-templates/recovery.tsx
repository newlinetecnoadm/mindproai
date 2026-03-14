/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Redefinir sua senha — Mind Pro AI</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <div style={header}>
          <Heading style={headerTitle}>Mind Pro AI</Heading>
        </div>
        <Container style={content}>
          <Heading style={h1}>Redefinir sua senha</Heading>
          <Text style={text}>
            Recebemos uma solicitação para redefinir sua senha no Mind Pro AI.
            Clique no botão abaixo para escolher uma nova senha.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Redefinir Senha
          </Button>
          <Text style={footer}>
            Se você não solicitou, ignore este e-mail. Sua senha não será alterada.
          </Text>
        </Container>
        <div style={footerBar}>
          <Text style={footerText}>Mind Pro AI — mindproai.com.br</Text>
          <Text style={footerSub}>Desenvolvido por Newline Tecnologia</Text>
        </div>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#f4f4f5', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif" }
const wrapper = { maxWidth: '520px', margin: '40px auto', backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden' as const, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }
const header = { background: 'linear-gradient(135deg, #F97316, #EA580C)', padding: '32px 24px', textAlign: 'center' as const }
const headerTitle = { margin: '0', color: '#ffffff', fontSize: '22px', fontWeight: '700' as const }
const content = { padding: '32px 24px' }
const h1 = { fontSize: '20px', fontWeight: 'bold' as const, color: '#1f1f1f', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#6b6b6b', lineHeight: '1.6', margin: '0 0 20px' }
const button = { backgroundColor: '#F97316', color: '#ffffff', fontSize: '14px', borderRadius: '10px', padding: '12px 32px', textDecoration: 'none', fontWeight: '600' as const }
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0' }
const footerBar = { padding: '16px 24px', backgroundColor: '#fafafa', borderTop: '1px solid #f0f0f0', textAlign: 'center' as const }
const footerText = { margin: '0 0 4px', color: '#a1a1aa', fontSize: '11px' }
const footerSub = { margin: '0', color: '#a1a1aa', fontSize: '10px' }
