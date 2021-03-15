import React, { useCallback } from "react";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { Modal, Form, Input, Button, Checkbox, Select, Space } from "antd";
import { serializePubkey } from "../../utils/utils";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { useMalloc } from "../../contexts/malloc";

const { Option } = Select;

export interface RegisterCallModalProps {
  isVisible: boolean;
  onCancel: () => void;
  onOk: () => void;
}

export function RegisterCallModal(props: RegisterCallModalProps) {
  const malloc = useMalloc();
  const { isVisible, onCancel, onOk } = props;

  const onFinish = useCallback(
    async (value: any) => {
      console.log(value);
      const { name, progId, input, associated_accounts } = value.call;
      const wcallPubkey = new PublicKey(progId);
      const associatedAccountsPubkeys = (associated_accounts || []).map(
        (account) => new PublicKey(account.pubkey)
      );
      const associatedAccountSigner = (
        associated_accounts || []
      ).map((account) =>
        account.signer?.length === 1 && account.signer[0] === "true" ? 1 : 0
      );
      const associatedAccountWriter = (
        associated_accounts || []
      ).map((account) =>
        account.writeable?.length === 1 && account.writeable[0] === "true"
          ? 1
          : 0
      );
      const insns: TransactionInstruction[] = [];
      const args = {
        call_name: name,
        wcall: {
          Simple: {
            wcall: wcallPubkey,
            input: input,
            associated_accounts: associatedAccountsPubkeys,
            // TODO: add in
            associated_account_is_signer: associatedAccountSigner,
            associated_account_is_writable: associatedAccountWriter,
          },
        },
      };
      console.log(args);
      insns.push(malloc.registerCall(args));
      await malloc.sendMallocTransaction(insns, []);
    },
    [malloc]
  );

  return (
    <Modal title="New Call" visible={isVisible} onOk={onOk} onCancel={onCancel}>
      <Form {...layout} name="register-call" onFinish={onFinish}>
        <Form.Item
          name={["call", "name"]}
          label="Call name"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name={["call", "input"]}
          label="Call input name"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name={["call", "progId"]}
          label="Call program ID"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name={["call", "description"]}
          label="Call description"
          rules={[{ required: true }]}
        >
          <Input.TextArea />
        </Form.Item>
        <Form.List name={["call", "associated_accounts"]}>
          {(fields, { add, remove }, { errors }) => (
            <>
              {fields.map((field, index) => (
                <Space
                  key={field.key}
                  style={{ display: "flex", marginBottom: 8 }}
                  align="baseline"
                >
                  <Form.Item
                    {...field}
                    name={[field.name, "pubkey"]}
                    fieldKey={[field.fieldKey, "pubkey"]}
                    rules={[{ required: true, message: "Missing pubkey" }]}
                  >
                    <Input placeholder="Public Key" />
                  </Form.Item>
                  <Form.Item
                    {...field}
                    name={[field.name, "writeable"]}
                    fieldKey={[field.fieldKey, "writeable"]}
                  >
                    <Checkbox.Group>
                      <Checkbox value="true">Writeable</Checkbox>
                    </Checkbox.Group>
                  </Form.Item>
                  <Form.Item
                    {...field}
                    name={[field.name, "signer"]}
                    fieldKey={[field.fieldKey, "signer"]}
                  >
                    <Checkbox.Group>
                      <Checkbox value="true">Signer</Checkbox>
                    </Checkbox.Group>
                  </Form.Item>
                  <MinusCircleOutlined onClick={() => remove(field.name)} />
                </Space>
              ))}
              <Form.Item>
                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                >
                  Add field
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
        <Form.Item wrapperCol={{ ...layout.wrapperCol, offset: 8 }}>
          <Button type="primary" htmlType="submit">
            Ok
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}

const layout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 16 },
};
